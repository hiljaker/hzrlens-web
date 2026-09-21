import Box from "@mui/material/Box";

export function LensIllustration() {
  return (
    <Box aria-hidden="true" sx={{ maxWidth: 410, mx: "auto", width: "100%" }}>
      <svg viewBox="0 0 410 340" width="100%" fill="none">
        <rect
          x="44"
          y="35"
          width="270"
          height="247"
          rx="18"
          fill="#E8EAD8"
          transform="rotate(-7 44 35)"
        />
        <rect
          x="65"
          y="34"
          width="278"
          height="250"
          rx="14"
          fill="#FFFDF8"
          stroke="#244D40"
          strokeWidth="2"
          transform="rotate(5 65 34)"
        />
        <path
          d="M90 82H211M90 97H167"
          stroke="#A1AA93"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M83 164H117L132 144L148 182L164 126L183 163H207"
          stroke="#244D40"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <rect x="87" y="213" width="124" height="13" rx="3" fill="#F0D86A" />
        <path
          d="M87 242H230"
          stroke="#DDDCCD"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M292 228L348 291"
          stroke="#244D40"
          strokeWidth="25"
          strokeLinecap="round"
        />
        <circle
          cx="248"
          cy="179"
          r="73"
          fill="#F7F5EC"
          stroke="#244D40"
          strokeWidth="4"
        />
        <circle cx="248" cy="179" r="61" fill="#F0D86A" />
        <path
          d="M197 183H220L232 158L247 197L265 162L279 183H298"
          stroke="#244D40"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle
          cx="265"
          cy="162"
          r="7"
          fill="#FFFDF8"
          stroke="#244D40"
          strokeWidth="3"
        />
        <path
          d="M336 80L350 63M348 97L368 91M317 66L319 46"
          stroke="#9B5935"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text
          x="166"
          y="327"
          fill="#62665B"
          fontSize="13"
          fontFamily="Georgia, serif"
          fontStyle="italic"
        >
          a little closer to the why.
        </text>
      </svg>
    </Box>
  );
}
