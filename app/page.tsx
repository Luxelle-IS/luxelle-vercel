export default function Home() {
  return (
    <main className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/70 shadow-sm p-8 border border-black/5">
        <div className="text-xs tracking-[0.25em] uppercase opacity-70">
          Luxelle
        </div>

        <h1 className="mt-4 text-3xl font-semibold leading-tight">
          Your luxury closet,
          <br />
          beautifully organized.
        </h1>

        <p className="mt-4 text-[15px] leading-relaxed opacity-80">
          Add your handbags with a photo, get a suggested match, and see an
          estimated value range for your collection.
        </p>

        <a
          href="https://tally.so/r/ODPO7Y"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block w-full text-center rounded-2xl bg-[#2C2A29] text-white px-4 py-3"
        >
          Join the waitlist
        </a>

        <div className="mt-6 text-xs opacity-60">
          Private by default. No public profiles.
        </div>
      </div>
    </main>
  );
}
