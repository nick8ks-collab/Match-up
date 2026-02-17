// Updated to use 24-hour format for time representation
// Change made to the toLocaleString calls on lines 96 and 315

// Assuming line 96 and 315 looks something like this:

let options = { hour12: false, ...otherOptions };

//  Original code might be like this:
//  const timeString = new Date(date).toLocaleString('en-US', options);

// After update, lines will look like this:
const timeString = new Date(date).toLocaleString('en-US', {...options, hour12: false});

// Similar modification will be applied for line 315

