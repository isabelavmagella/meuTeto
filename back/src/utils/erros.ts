export function erroPrisma(
  err: any,
  mensagemDuplicado: string,
): { status: number; error: string } | null {
  if (err?.code === "P2002") {
    return { status: 409, error: mensagemDuplicado };
  }
  return null;
}
