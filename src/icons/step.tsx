interface StepIconProps {
  label: string;
}

export function StepIcon({ label }: StepIconProps) {
  return <span className="text-sm font-semibold">{label}</span>;
}
