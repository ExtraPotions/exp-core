'use strict';
// Allow at most one eighth of a CSS pixel for measured browser coordinates.
// This covers subpixel rounding/privacy noise without permitting a visible layout shift.
const epsilon = 0.125;
const near = (actual, expected) => Math.abs(actual - expected) <= epsilon;
module.exports = {epsilon, near};
