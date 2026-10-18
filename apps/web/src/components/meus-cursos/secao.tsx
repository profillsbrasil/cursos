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
      {/* 14 px entre o título e o conteúdo, como a Secao do admin (DESIGN.md, Layout). */}
      {/* O subtítulo fica embaixo do título, junto do que resume. */}
      <div className="mb-3.5 grid gap-0.5">
        <h2 className="font-bold text-2xl text-titulo tracking-tight" id={id}>
          {titulo}
        </h2>
        {subtitulo ? (
          <p className="text-muted-foreground text-sm">{subtitulo}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
