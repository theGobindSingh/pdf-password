interface StepIconProps {
  label: string;
}

export const StepIcon = ({ label }: StepIconProps) => (
  <span className="text-sm font-semibold">{label}</span>
);
