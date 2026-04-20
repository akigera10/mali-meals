export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-fraunces), serif",
            fontSize: "48px",
            fontWeight: 400,
            color: "var(--text-primary)",
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          Mali&apos;s Meals
        </h1>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "18px",
            fontWeight: 400,
            color: "var(--text-secondary)",
            marginTop: "8px",
            marginBottom: 0,
          }}
        >
          Home-cooked meals, delivered Sunday evenings in Nairobi
        </p>
      </div>
    </main>
  );
}
