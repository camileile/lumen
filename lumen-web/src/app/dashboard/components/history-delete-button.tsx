export function HistoryDeleteButton({ deleting, className, onDelete }: {
  deleting: boolean;
  className?: string;
  onDelete: () => void;
}) {
  return <button className={className} type="button" disabled={deleting} onClick={onDelete}>
    {deleting ? "Excluindo…" : "Excluir histórico"}
  </button>;
}
