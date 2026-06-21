/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                financial: {
                    income: '#10b981',
                    mortgage: '#ef4444',
                    childcare: '#f59e0b',
                    debt: '#3b82f6',
                    insurance: '#8b5cf6',
                    gold: '#fbbf24'
                }
            },
            animation: {
                'wobble': 'wobble 0.5s ease-in-out infinite',
            },
            keyframes: {
                wobble: {
                    '0%, 100%': { transform: 'rotate(-1deg)' },
                    '50%': { transform: 'rotate(1deg)' },
                }
            }
        },
    },
    plugins: [],
}
