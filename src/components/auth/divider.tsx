export function Divider({ label }: { label: string }) {
  return (
    <div aria-hidden className="flex items-center">
      <div className="flex-grow border-t border-outline-variant" />
      <span className="bg-surface-container-lowest px-4 text-label-caps text-outline uppercase">
        {label}
      </span>
      <div className="flex-grow border-t border-outline-variant" />
    </div>
  );
}
