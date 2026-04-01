export const sanitizeCpf = (value: string) => value.replace(/\D/g, "");

export const formatCpf = (value: string) => {
  const digits = sanitizeCpf(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

export const isValidCpf = (value: string) => {
  const cpf = sanitizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calculateDigit = (base: string, factor: number) => {
    const total = base.split("").reduce((sum, digit) => {
      return sum + Number(digit) * factor--;
    }, 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

  return (
    firstDigit === Number(cpf.charAt(9)) &&
    secondDigit === Number(cpf.charAt(10))
  );
};

