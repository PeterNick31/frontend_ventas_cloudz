export default function PageHeader({ titulo, subtitulo, acciones, migas }) {
  return (
    <header className="page-header">
      <div>
        {migas && <div className="migas">{migas}</div>}
        <h1>{titulo}</h1>
        {subtitulo && <p className="subtitulo">{subtitulo}</p>}
      </div>
      {acciones && <div className="page-acciones">{acciones}</div>}
    </header>
  );
}
