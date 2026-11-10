export function ExtensionSessionRevokeButton({ revoking, className, onRevoke }: {
  revoking: boolean;
  className?: string;
  onRevoke: () => void;
}) {
  return <button className={className} type="button" disabled={revoking} onClick={onRevoke}>
    {revoking ? "Revogando…" : "Revogar"}
  </button>;
}
