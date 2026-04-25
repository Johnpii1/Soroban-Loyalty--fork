interface Props {
  faqId: string;
  label?: string;
}

/** Contextual help icon (?) that links to a specific FAQ entry. */
export function HelpIcon({ faqId, label = "Help" }: Props) {
  return (
    <a
      href={`/help#${faqId}`}
      className="help-icon"
      aria-label={label}
      title={label}
      target="_self"
    >
      ?
    </a>
  );
}
