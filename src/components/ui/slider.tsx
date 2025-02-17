import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  color?: string;
  formatTooltip?: (value: number) => React.ReactNode;
}


const Slider = React.forwardRef<
React.ElementRef<typeof SliderPrimitive.Root>,
SliderProps
>(({ className, color = "#000000", formatTooltip = (value) => <span>{value}</span>, ...props }, ref) => {
const [showTooltip, setShowTooltip] = React.useState(false)
const [value, setValue] = React.useState(props.defaultValue || props.value || [0])

return (
  <TooltipProvider>
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      onValueChange={setValue}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range 
          className="absolute h-full" 
          style={{ backgroundColor: color }}
        />
      </SliderPrimitive.Track>
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>
          <SliderPrimitive.Thumb 
            className="block h-3.5 w-2.5 rounded-full border-2 bg-background ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab"
            style={{ borderColor: color }}
          />
        </TooltipTrigger>
        <TooltipContent>
          {formatTooltip(value[0])}
        </TooltipContent>
      </Tooltip>
    </SliderPrimitive.Root>
  </TooltipProvider>
)
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }