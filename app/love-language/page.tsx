import LoveLanguageQuiz from "@/components/LoveLanguageQuiz";

export const metadata = {
  title: "Astro-Love · Your Love Language",
  description: "A quick, honest quiz to find how you most give and receive love. No birth data needed.",
};

export default function Page() {
  return <LoveLanguageQuiz />;
}
