/**
 * SIGMA ELMS - Combined into js/classroom-room.js
 * The Draggable Sections Panel and Classroom Room are now unified in js/classroom-room.js.
 * This file is retained for seamless backward compatibility.
 */
(function (global) {
    'use strict';
    if (global.ClassroomRoom && global.ClassroomRoom.SectionsPanel) {
        global.SectionsPanel = global.ClassroomRoom.SectionsPanel;
    }
})(typeof window !== 'undefined' ? window : this);

