import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="landing-page">
      <div style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: "20px",
      }}>
        <div style={{ textAlign: "center", maxWidth: "600px" }}>
          <p style={{
            color: "var(--gold)",
            textTransform: "uppercase",
            letterSpacing: ".18em",
            fontSize: "10px",
            fontWeight: "600",
            marginBottom: "20px",
          }}>
            <span style={{
              display: "inline-block",
              width: "22px",
              height: "1px",
              marginRight: "8px",
              verticalAlign: "middle",
              background: "var(--gold)",
            }} />
            Signal Lost
          </p>
          <h1 style={{
            fontSize: "clamp(80px, 20vw, 180px)",
            color: "var(--gold)",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: "500",
            letterSpacing: "-.08em",
            lineHeight: ".8",
            marginBottom: "20px",
          }}>
            404
          </h1>
          <h2 style={{
            fontSize: "clamp(28px, 5vw, 44px)",
            color: "var(--cream)",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: "500",
            letterSpacing: "-.065em",
            marginBottom: "16px",
          }}>
            Lost in the flow of time?
          </h2>
          <p style={{
            color: "rgba(243,234,214,.6)",
            fontSize: "16px",
            marginBottom: "40px",
            lineHeight: "1.6",
          }}>
            The page you're looking for doesn't exist or has moved somewhere else in the stream.
          </p>
          <div style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 20px",
                backgroundColor: "var(--gold)",
                color: "var(--ink)",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "13px",
                borderRadius: "3px",
                transition: "transform .2s, box-shadow .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 35px rgba(215,170,88,.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Return Home <span aria-hidden="true">↑</span>
            </Link>
            <Link
              to="/download"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 20px",
                backgroundColor: "transparent",
                border: "1px solid rgba(243,234,214,.2)",
                color: "rgba(243,234,214,.8)",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "13px",
                borderRadius: "3px",
                transition: "color .2s, border-color .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--gold)";
                e.currentTarget.style.borderColor = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(243,234,214,.8)";
                e.currentTarget.style.borderColor = "rgba(243,234,214,.2)";
              }}
            >
              Download
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
