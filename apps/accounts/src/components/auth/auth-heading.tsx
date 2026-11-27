export function AuthHeading({
  title,
  description,
  eyebrow,
}: {
  readonly title: string;
  readonly description?: React.ReactNode;
  readonly eyebrow?: string;
}) {
  return (
    <div className="zc-heading" data-reveal>
      {eyebrow ? <p className="zc-eyebrow">{eyebrow}</p> : null}
      <h1 className="zc-title">{title}</h1>
      {description ? <p className="zc-lead">{description}</p> : null}
    </div>
  );
}
