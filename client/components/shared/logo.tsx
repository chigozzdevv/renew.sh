import { cn } from "@/lib/utils";

type LogoProps = {
  inverted?: boolean;
};

export function Logo({ inverted = false }: LogoProps) {
  return (
    <div
      className={cn(
        "relative h-8 w-[7.75rem] overflow-hidden sm:h-9 sm:w-[8.5rem]",
        inverted ? "opacity-95" : "",
      )}
    >
      <img
        src="/renew-logo.png"
        alt="Renew"
        width={500}
        height={500}
        className={cn(
          "h-full w-full object-cover object-center",
          inverted ? "brightness-0 invert" : "",
        )}
      />
    </div>
  );
}
