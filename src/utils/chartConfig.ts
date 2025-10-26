// Chart configuration utilities for consistent styling across the application

export const chartTooltipConfig = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    color: 'hsl(var(--popover-foreground))'
  },
  labelStyle: { 
    color: 'hsl(var(--popover-foreground))' 
  }
};

// Common chart colors
export const chartColors = {
  primary: '#8884d8',
  secondary: '#82ca9d',
  tertiary: '#ffc658',
  quaternary: '#ff7c7c',
  quinary: '#8dd1e1'
};

// Chart theme configuration for dark/light mode compatibility
export const chartGridConfig = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--border))'
};

export const chartAxisConfig = {
  tick: { fill: 'hsl(var(--muted-foreground))' },
  axisLine: { stroke: 'hsl(var(--border))' },
  tickLine: { stroke: 'hsl(var(--border))' }
};