// Other existing code

// Line 96 - Modify fmt function
const optionsHour1 = { hour: 'numeric', minute: 'numeric', hour12: false, timeStyle: 'medium' };
const formattedTime1 = new Intl.DateTimeFormat('en-US', optionsHour1).format(date1);

// Other existing code

// Line 315 - Modify fmt function
const optionsHour2 = { hour: 'numeric', minute: 'numeric', hour12: false, timeStyle: 'medium' };
const formattedTime2 = new Intl.DateTimeFormat('en-US', optionsHour2).format(date2);

// Other existing code