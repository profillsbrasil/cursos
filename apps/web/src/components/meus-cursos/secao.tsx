export function Secao({
  children,
  id,
  subtitulo,
  titulo,
}: {
  children: React.ReactNode;
  id: string;
  subtitulo: string;
  titulo: string;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          className="font-bold text-[22px] text-titulo tracking-tight"
          id={id}
        >
          {titulo}
        </h2>
        <p className="text-muted-foreground text-sm">{subtitulo}</p>
      </div>
      {children}
    </section>
  );
}
