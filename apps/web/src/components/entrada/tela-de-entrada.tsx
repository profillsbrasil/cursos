// O login e o cadastro ficam fora da casca: o cartão do Clerk sozinho, centrado.
export function TelaDeEntrada({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background grid min-h-dvh place-items-center px-4 py-10">
      {children}
    </main>
  );
}
