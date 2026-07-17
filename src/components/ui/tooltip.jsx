import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip" // Adjust this import path to match your project
import { Button } from "@/components/ui/button"

export function TooltipDemo() {
    return (
        // TooltipProvider should ideally wrap your entire app (e.g., in layout.tsx) 
        // so you don't have to import it every time, but it can also wrap individual tooltips.
        <TooltipProvider delayDuration={300}>
            <Tooltip>

                {/* The Trigger is what the user interacts with (hovers/focuses) */}
                <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                </TooltipTrigger>

                {/* The Content is the popover that appears */}
                <TooltipContent side="top" align="center">
                    <p>Add to library</p>
                </TooltipContent>

            </Tooltip>
        </TooltipProvider>
    )
}