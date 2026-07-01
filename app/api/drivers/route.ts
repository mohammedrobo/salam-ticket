import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getSupabase from '@/lib/db';
import { isValidOffice } from '@/lib/offices';

async function getOfficeId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('office_session');
  if (!session || !isValidOffice(session.value)) return null;
  return session.value;
}

export async function GET(request: Request) {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get('include_completed') === 'true';

    // Auto-return expired breaks
    const breakDurationMs = 60 * 60 * 1000;
    const { data: onBreakDrivers } = await supabase
      .from('drivers')
      .select('id, break_started_at')
      .eq('office_id', officeId)
      .eq('status', 'on_break');

    if (onBreakDrivers && onBreakDrivers.length > 0) {
      const now = Date.now();
      for (const bd of onBreakDrivers) {
        if (bd.break_started_at) {
          const breakStart = new Date(bd.break_started_at).getTime();
          if (now - breakStart >= breakDurationMs) {
            await supabase
              .from('drivers')
              .update({ status: 'waiting', break_started_at: null })
              .eq('id', bd.id)
              .eq('office_id', officeId);
          }
        }
      }
    }

    const { data: waitingData, error: waitingError } = await supabase
      .from('drivers')
      .select('*')
      .eq('office_id', officeId)
      .eq('status', 'waiting')
      .order('scanned_at', { ascending: true });

    if (waitingError) {
      console.error('GET drivers error:', waitingError);
      return NextResponse.json({ error: waitingError.message }, { status: 500 });
    }

    if (includeCompleted) {
      const { data: breakData } = await supabase
        .from('drivers')
        .select('*')
        .eq('office_id', officeId)
        .eq('status', 'on_break')
        .order('break_started_at', { ascending: true });

      let completedData: Record<string, unknown>[] | null = null;
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error: completedError } = await supabase
        .from('drivers')
        .select('*')
        .eq('office_id', officeId)
        .eq('status', 'checked_out')
        .gte('completed_at', fiveMinAgo)
        .order('completed_at', { ascending: false });

      if (completedError && completedError.message?.includes('completed_at')) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: fallbackData } = await supabase
          .from('drivers')
          .select('*')
          .eq('office_id', officeId)
          .eq('status', 'checked_out')
          .gte('scanned_at', oneHourAgo)
          .order('scanned_at', { ascending: false });
        completedData = fallbackData;
      } else {
        completedData = data;
      }

      return NextResponse.json({
        waiting: waitingData || [],
        on_break: breakData || [],
        completed: completedData || [],
      });
    }

    const { data: finalWaiting } = await supabase
      .from('drivers')
      .select('*')
      .eq('office_id', officeId)
      .eq('status', 'waiting')
      .order('scanned_at', { ascending: true });

    return NextResponse.json(finalWaiting || []);
  } catch (err) {
    console.error('GET drivers exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, office_id, device_id } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!phone || phone.trim() === '') {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    if (!office_id || !isValidOffice(office_id)) {
      return NextResponse.json({ error: 'Invalid office' }, { status: 400 });
    }

    if (!device_id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Cleanup old checked_out records (older than 24h)
    await supabase
      .from('drivers')
      .delete()
      .eq('status', 'checked_out')
      .lt('scanned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Find or create driver_account by device_id
    let driverAccountId: string;

    const { data: existingAccount } = await supabase
      .from('driver_accounts')
      .select('id, full_name')
      .eq('device_id', device_id)
      .maybeSingle();

    if (existingAccount) {
      driverAccountId = existingAccount.id;

      // If name doesn't match, update it (driver might have changed name)
      if (existingAccount.full_name.toLowerCase() !== name.trim().toLowerCase()) {
        await supabase
          .from('driver_accounts')
          .update({ full_name: name.trim(), phone: phone.trim() })
          .eq('id', driverAccountId);
      }
    } else {
      // Create new driver account
      const { data: newAccount, error: accountError } = await supabase
        .from('driver_accounts')
        .insert({
          device_id,
          full_name: name.trim(),
          phone: phone.trim(),
        })
        .select('id')
        .single();

      if (accountError) {
        console.error('Create driver_account error:', accountError);
        return NextResponse.json({ error: accountError.message }, { status: 500 });
      }

      driverAccountId = newAccount.id;
    }

    // Check if this device is already in the live queue
    const { data: existingDevice } = await supabase
      .from('drivers')
      .select('id, name, status, scanned_at')
      .eq('device_id', device_id)
      .eq('office_id', office_id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDevice) {
      if (existingDevice.name.toLowerCase() !== name.trim().toLowerCase()) {
        return NextResponse.json(
          { error: 'device_mismatch', registered_name: existingDevice.name },
          { status: 409 }
        );
      }

      if (existingDevice.status === 'waiting') {
        const [{ count: total }, { count: ahead }] = await Promise.all([
          supabase
            .from('drivers')
            .select('*', { count: 'exact', head: true })
            .eq('office_id', office_id)
            .eq('status', 'waiting'),
          supabase
            .from('drivers')
            .select('*', { count: 'exact', head: true })
            .eq('office_id', office_id)
            .eq('status', 'waiting')
            .lt('scanned_at', existingDevice.scanned_at),
        ]);

        return NextResponse.json(
          { error: 'already_in_queue', driver: existingDevice, position: (ahead ?? 0) + 1, total: total ?? 0, driver_account_id: driverAccountId },
          { status: 409 }
        );
      }

      if (existingDevice.status === 'on_break') {
        const { data, error } = await supabase
          .from('drivers')
          .update({ status: 'waiting', break_started_at: null })
          .eq('id', existingDevice.id)
          .select('id, name, status, office_id, scanned_at')
          .single();

        if (error) {
          console.error('POST driver break-return error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const [{ count: total }, { count: ahead }] = await Promise.all([
          supabase
            .from('drivers')
            .select('*', { count: 'exact', head: true })
            .eq('office_id', office_id)
            .eq('status', 'waiting'),
          supabase
            .from('drivers')
            .select('*', { count: 'exact', head: true })
            .eq('office_id', office_id)
            .eq('status', 'waiting')
            .lt('scanned_at', data.scanned_at),
        ]);

        return NextResponse.json({ ...data, position: (ahead ?? 0) + 1, total: total ?? 0, driver_account_id: driverAccountId }, { status: 200 });
      }

      // Was checked out — re-join
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('drivers')
        .update({ status: 'waiting', scanned_at: now })
        .eq('id', existingDevice.id)
        .select('id, name, status, office_id, scanned_at')
        .single();

      if (error) {
        console.error('POST driver re-join error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const [{ count: total }, { count: ahead }] = await Promise.all([
        supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true })
          .eq('office_id', office_id)
          .eq('status', 'waiting'),
        supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true })
          .eq('office_id', office_id)
          .eq('status', 'waiting')
          .lt('scanned_at', now),
      ]);

      return NextResponse.json({ ...data, position: (ahead ?? 0) + 1, total: total ?? 0, driver_account_id: driverAccountId }, { status: 200 });
    }

    // New device — check if name is already in queue
    const { data: existingName } = await supabase
      .from('drivers')
      .select('id')
      .eq('name', name.trim())
      .eq('office_id', office_id)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existingName) {
      return NextResponse.json(
        { error: 'You are already in the queue. Wait for the manager to check you out.' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        name: name.trim(),
        office_id,
        device_id,
        scanned_at: now,
        driver_account_id: driverAccountId,
      })
      .select('id, name, status, office_id, scanned_at')
      .single();

    if (error) {
      console.error('POST driver error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [{ count: total }, { count: ahead }] = await Promise.all([
      supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', office_id)
        .eq('status', 'waiting'),
      supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', office_id)
        .eq('status', 'waiting')
        .lt('scanned_at', now),
    ]);

    return NextResponse.json({ ...data, position: (ahead ?? 0) + 1, total: total ?? 0, driver_account_id: driverAccountId }, { status: 201 });
  } catch (err) {
    console.error('POST driver exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch the driver before deleting to get delivery info
    const { data: driver } = await supabase
      .from('drivers')
      .select('id, driver_account_id, scanned_at, office_id')
      .eq('id', parseInt(id))
      .eq('office_id', officeId)
      .maybeSingle();

    const now = new Date().toISOString();

    // Write to delivery_history before soft-deleting
    if (driver?.driver_account_id) {
      await supabase.from('delivery_history').insert({
        driver_account_id: driver.driver_account_id,
        office_id: officeId,
        scanned_at: driver.scanned_at,
        completed_at: now,
      });
    }

    const { error } = await supabase
      .from('drivers')
      .update({ status: 'checked_out', completed_at: now })
      .eq('id', parseInt(id))
      .eq('office_id', officeId);

    if (error && error.message?.includes('completed_at')) {
      await supabase
        .from('drivers')
        .update({ status: 'checked_out' })
        .eq('id', parseInt(id))
        .eq('office_id', officeId);
    }

    if (error && !error.message?.includes('completed_at')) {
      console.error('DELETE driver error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE driver exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
