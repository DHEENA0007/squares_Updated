import { forwardRef, SVGProps } from "react";

export const IndianRupee = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <path d="M6 3h12" />
        <path d="M6 8h12" />
        <path d="M6 13h8c2 0 3 1 3 3s-1 3-3 3H6" />
        <path d="M8 16h4" />
        <path d="M8 19h4" />
        <path d="M6 8V3" />
        <path d="M18 8V3" />
      </svg>
    );
  }
);

IndianRupee.displayName = "IndianRupee";
