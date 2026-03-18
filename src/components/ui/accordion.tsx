import {
  type ButtonHTMLAttributes,
  Children,
  cloneElement,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from 'react';

type AccordionProps = HTMLAttributes<HTMLDivElement>;

interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  defaultOpen?: boolean;
}

interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

type AccordionContentProps = HTMLAttributes<HTMLDivElement>;

export const Accordion = ({ className = '', ...props }: AccordionProps) => (
  <div className={className} {...props} />
);

export const AccordionItem = ({
  className = '',
  defaultOpen = false,
  children,
  ...props
}: AccordionItemProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const renderedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) {
      return child;
    }

    if (child.type === AccordionTrigger) {
      return cloneElement(child as ReactElement<AccordionTriggerProps>, {
        key: child.key ?? index,
        'aria-expanded': open,
        'aria-controls': contentId,
        onClick: () => setOpen((value) => !value),
      });
    }

    if (child.type === AccordionContent) {
      return cloneElement(
        child as ReactElement<AccordionContentProps & { hidden?: boolean }>,
        {
          key: child.key ?? index,
          id: contentId,
          hidden: !open,
        },
      );
    }

    return child;
  });

  return (
    <div
      data-state={open ? 'open' : 'closed'}
      className={[
        'rounded-xl border border-border/80 bg-card/70 backdrop-blur-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {renderedChildren}
    </div>
  );
};

export const AccordionTrigger = ({
  className = '',
  children,
  type = 'button',
  ...props
}: AccordionTriggerProps) => {
  const expanded = props['aria-expanded'] === true;

  return (
    <button
      type={type}
      className={[
        'flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      ].join(' ')}
      {...props}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={[
          'text-lg leading-none text-muted-foreground transition-transform duration-200',
          expanded ? 'rotate-45' : 'rotate-0',
        ].join(' ')}
      >
        +
      </span>
    </button>
  );
};

export const AccordionContent = ({
  className = '',
  children,
  hidden,
  ...props
}: AccordionContentProps & { hidden?: boolean }) => (
  <div
    className={[
      'px-5 pb-5 text-sm leading-6 text-muted-foreground',
      hidden ? 'hidden' : 'block',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </div>
);
