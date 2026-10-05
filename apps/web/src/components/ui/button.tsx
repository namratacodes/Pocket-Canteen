import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-brand text-white shadow hover:bg-brand-dark',
        destructive: 'bg-danger text-white shadow-sm hover:bg-red-700',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-brand underline-offset-4 hover:underline',
        success: 'bg-success text-white shadow-sm hover:bg-green-700',
      },
      size: {
        default: 'h-11 px-4 py-2 min-h-[44px]',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-13 rounded-2xl px-8 text-base min-h-[52px]',
        kitchen: 'h-14 rounded-2xl px-6 text-lg font-semibold min-h-[56px]', // 56px touch target for staff
        icon: 'h-10 w-10 min-w-[40px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
