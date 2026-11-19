export function Secao({
  children,
  id,
  subtitulo,
  titulo,
}: {
  children: React.ReactNode;
  id: string;
  subtitulo?: string;
  titulo: string;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3.5 grid gap-0.5">
        <h2 className="text-titulo text-2xl font-bold tracking-tight" id={id}>
          {titulo}
        </h2>
        {subtitulo ? (
          <p className="text-muted-foreground">{subtitulo}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
