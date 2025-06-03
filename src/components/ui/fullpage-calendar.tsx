import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type FullPageCalendarProps = React.ComponentProps<typeof DayPicker>;

function FullPageCalendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: FullPageCalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "w-full h-full m-0 p-0 bg-white",
        className
      )}
      classNames={{
        root: "w-full h-full flex flex-col items-stretch",
        months: "flex w-full h-full justify-center items-center",
        month: "w-full h-full flex flex-col",
        caption: "flex justify-center py-2 sm:py-4 mb-2 sm:mb-4 relative items-center",
        caption_label: "text-lg sm:text-xl font-medium",
        nav: "space-x-1 sm:space-x-2 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 sm:h-10 sm:w-10 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-2 sm:left-4",
        nav_button_next: "absolute right-2 sm:right-4",
        table: "w-full h-full border-collapse flex flex-col flex-1",
        head_row: "flex w-full h-10 sm:h-14",
        head_cell:
          "text-sm sm:text-lg font-medium text-gray-600 uppercase flex-1 flex items-center justify-center px-1",
        row: "flex w-full flex-1",
        cell: "flex-1 flex items-center justify-center p-0.5 sm:p-1 min-w-0",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 sm:h-16 sm:w-16 flex items-center justify-center text-sm sm:text-lg rounded-md hover:bg-gray-100 p-0 font-medium aria-selected:opacity-100 min-w-0 flex-shrink-0"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />,
      }}
      {...props}
    />
  );
}
FullPageCalendar.displayName = "FullPageCalendar";

export { FullPageCalendar };
