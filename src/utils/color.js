// @type (string) => boolean
//
// Check if string contains valid CSS3 color, e.g. "blue", "#fff", "rgb(50, 50, 100)".
let isValidColorString = (string) => {
  try {
    parseColor(string);
  } catch (error) {
    return false;
  }

  return true;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export { isValidColorString };
