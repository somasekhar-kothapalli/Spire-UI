// @type (any) => boolean
//
// Returns true if the passed argument is either a number or a string that represents a number.
export let isNumeric = (arg) => {
  return !Array.isArray(arg) && (arg - parseFloat(arg) + 1) >= 0;
};
