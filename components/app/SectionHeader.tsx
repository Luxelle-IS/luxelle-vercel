type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.32em] uppercase text-[#8B7E72]">
        {eyebrow}
      </div>

      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6E645B] md:text-[15px]">
          {description}
        </p>
      )}
    </div>
  );
}