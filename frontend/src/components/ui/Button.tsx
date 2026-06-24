import { cn } from '@/utils'

export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}) {
  const variants = {
    default: 'bg-primary text-white hover:bg-primary-dark shadow-sm shadow-red-200/50',
    outline: 'border border-slate-200 bg-white hover:bg-primary-subtle hover:border-red-200',
    ghost: 'hover:bg-primary-subtle hover:text-primary-darker',
    destructive: 'bg-red-700 text-white hover:bg-red-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  }
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-11 px-6',
    icon: 'h-10 w-10',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
