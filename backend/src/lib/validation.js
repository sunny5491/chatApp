/**
 * Input validation utilities for PrivTalk backend
 */

/**
 * Validates an email address format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength (min 6 chars)
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters" };
  }
  return { valid: true, message: "" };
};

/**
 * Sanitizes a string by trimming whitespace
 * @param {string} str
 * @returns {string}
 */
export const sanitizeString = (str) => {
  if (typeof str !== "string") return "";
  return str.trim();
};

/**
 * Checks if a MongoDB ObjectId string is valid (24 hex chars)
 * @param {string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  return /^[a-f\d]{24}$/i.test(id);
};
