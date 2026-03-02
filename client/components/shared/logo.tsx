import { cn } from "@/lib/utils";

type LogoProps = {
  inverted?: boolean;
};

export function Logo({ inverted = false }: LogoProps) {
  return (
    <div
      className={cn(
        "relative h-7 w-[6.75rem] overflow-hidden sm:h-9 sm:w-[8.5rem]",
        inverted ? "opacity-95" : "",
      )}
    >
      <img
        src="/renew-logo.png"
        alt="Renew"
        width={500}
        height={500}
        className={cn(
          "h-full w-full origin-left object-cover object-center scale-[1.42] -translate-x-[10%] sm:scale-[1.18] sm:-translate-x-[5%]",
          inverted ? "brightness-0 invert" : "",
        )}
      />
    </div>
  );
}
