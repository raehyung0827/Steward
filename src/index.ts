function greet(name: string): string {
    return `Hello ${name}!!!`;
}

console.log(greet("123"));

try {
    process.loadEnvFile();
} catch {
    // prod inject env
}

console.log("PORT:", process.env.PORT, "| typeof:", typeof process.env.PORT);
console.log("DB:", process.env.DATABASE_URL);