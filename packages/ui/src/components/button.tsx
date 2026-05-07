import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/utils'

const buttonVariants = cva(
  'ui-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'primary border border-primary/35 bg-primary/15 text-primary hover:bg-primary/25',
        primary:
          'primary border border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        destructive:
          'border border-destructive/35 bg-destructive/15 text-destructive hover:bg-destructive/25',
        danger:
          'danger border border-destructive/35 bg-destructive/15 text-destructive hover:bg-destructive/25',
        outline:
          'outline border border-input bg-background/10 text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/10',
        secondary:
          'secondary border border-secondary/25 bg-secondary/10 text-secondary hover:bg-secondary/15',
        ghost: 'ghost text-foreground hover:bg-foreground/10',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={asChild ? undefined : type}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
