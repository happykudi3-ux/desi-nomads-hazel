import "./globals.css";

export const metadata = {
  title: "Desi Nomads — Hazel",
  description:
    "Hazel, the AI travel assistant from Desi Nomads. Plan before you travel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
