export function randomString(len) {
    if (isNaN(len)) {
        len = 6
    }
    return Math.random().toString(36).substring(len);
}