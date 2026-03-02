import { cn } from "@/lib/utils";

type LogoProps = {
  inverted?: boolean;
};

export function Logo({ inverted = false }: LogoProps) {
  return (
    <div
      className={cn(
        "relative h-9 w-[8.5rem] overflow-hidden max-sm:h-7 max-sm:w-[6.75rem]",
        inverted ? "opacity-95" : "",
      )}
    >
      <img
        src="/renew-logo.png"
        alt="Renew"
        width={500}
        height={500}
        className={cn(
          "h-full w-full object-cover object-center max-sm:origin-left max-sm:scale-[1.42] max-sm:-translate-x-[10%]",
          inverted ? "brightness-0 invert" : "",
        )}
      />
    </div>
  );
}
