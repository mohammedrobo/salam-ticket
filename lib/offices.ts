import { createHash } from 'crypto';

interface Office {
  name: string;
  passwordHash: string;
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

const OFFICES: Record<string, Office> = {
  QCA2: { name: 'QCA2', passwordHash: hashPassword('kT9mPq2xRv') },
  QCA3: { name: 'QCA3', passwordHash: hashPassword('jN5wLb8sYh') },
  QCA5: { name: 'QCA5', passwordHash: hashPassword('mV8pJn3wKe') },
  QCC8: { name: 'QCC8', passwordHash: hashPassword('hM3nFc6dWa') },
  QCD7: { name: 'QCD7', passwordHash: hashPassword('pR7kXt4vQe') },
  TEST: { name: 'TEST', passwordHash: hashPassword('test') },
};

export function authenticate(officeName: string, password: string): boolean {
  const office = OFFICES[officeName.toUpperCase()];
  if (!office) return false;
  return office.passwordHash === hashPassword(password);
}

export function getOffice(name: string): Office | null {
  return OFFICES[name.toUpperCase()] ?? null;
}

export function isValidOffice(name: string): boolean {
  return name.toUpperCase() in OFFICES;
}

export const OFFICE_NAMES = Object.keys(OFFICES);
