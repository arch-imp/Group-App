let classListName;
let listOfClassLists;
let names;
let checkboxes;
let grouping;
let groupingName;
let saved;

/*
Event handler function, called when the page initially loads. Retrieves any previously uploaded class lists from
localStorage, then builds the drop-down menu based on the user's lists (with option to upload a new list).
*/
function onLoad() {

	names = [];
	checkboxes = [];

	buildListOfClassLists();

	buildOptions();
	document.getElementById("dropDown").value = "new";
}

/*
Helper function which accesses lists saved in localStorage and builds the internal map of lists for the program.
to use
*/
function buildListOfClassLists() {
	listOfClassLists = new Map();

	let index = 0;
	while (true) {
		let thisListName = localStorage.getItem(index.toString());
		if (thisListName == null) {
			break;
		}

		let thisList = localStorage.getItem(thisListName);

		if (thisList == null) {
			break;
		}
		let thisListFormattedRight = [];

		let name = "";
		for (let i = 0; i <= thisList.length; i++) {
			if (thisList.length == 0) {
				break;
			} else if (thisList[i] == ',' || i == thisList.length) {
				thisListFormattedRight.push(name);
				name = "";
			} else {
				name += thisList[i];
			}
		}
		listOfClassLists.set(thisListName, thisListFormattedRight);
		index++;
	}
}

/*
Helper function which builds the drop-down menu for selecting class list.
*/
function buildOptions() {
	let dropDown = document.getElementById("dropDown");

	if (listOfClassLists.size > 0) {
		for (let el of listOfClassLists.keys()) {
			let option = document.createElement("option");
			option.value = el;
			option.innerHTML = el;
			dropDown.appendChild(option);
		}
	}

	let option = document.createElement("option");
	option.value = "new";
	option.innerHTML = "Upload new class list (.csv)";
	dropDown.appendChild(option);
}

/*
Event handler function called whenever a user submits a value in the drop-down class list select. If they chose to 
upload a new list, we open the file explorer to let them choose a new .csv file. Otherwise, we just access their
selected list and move forward using that data.
*/
function submitted() {
	classListName = document.getElementById("dropDown").value;

	if (classListName == "new") {
		document.getElementById("fileSelect").click();
		return;
	}

	names = listOfClassLists.get(classListName);

	if (names.length == 0) {
		alert("This class is empty");
		return;
	}

	clearChildren("studentList");
	for (let name of names) {
		addListElement(name);
	}
	showConfigurationMenu();
}

/* 
Event handler function, called when a user selects and submits a file. If the file is named and validated properly,
then we parse the text in it and set up the configuration menu
*/
function fileSelected() {
	let fileSelect = document.getElementById("fileSelect");
	let file = fileSelect.files[0];
	let proceed = checkForValidFileInput(file);

	if (proceed) {
		parseFile(file, true);

		showConfigurationMenu();
	}
}

/*
Helper function called whenever a user has uploaded a new class list as a file. Uses alerts to guide the user through
the file upload process. The function makes sure that it is a .csv file, and that the user selects a valid name for it. 
Returns false if the user declines to name the class list (or overwrite an existing list in the case of duplicates), or 
if the file type is incorrect. Otherwise, everything runs smoothly, and we return true.
*/
function checkForValidFileInput(file) {
	fileSelect.value = "";
	fileSelectEdit.value = "";

	if (file.type === 'text/csv') {
		let listName = prompt("Choose a name for this class list", `Period ${listOfClassLists.size + 1}`);
		if (listName == null || listName == "") {
			return false;
		}
		classListName = listName;
		if (listOfClassLists.has(classListName)) {
			let overwrite = confirm(`You have already uploaded a class list called ${classListName}. Saving a new list with the same name will overwrite the old data. Do you wish to continue?`)
			if (!overwrite) {
				return false;
			}
		}
		localStorage.setItem(listOfClassLists.size, classListName);
		return true;
	} else {
		alert("Incorrect file type. Class list must be a .csv text file");
		return false;
	}
}

/*
Helper function called by the fileSelected function which, given a text file of a specific format, extracts student
names from the file, normalizes their formatting, saves them in a list, and builds the HTML unordered list to display to the user.
*/
function parseFile(file, buildingList) {
	names = [];
	checkboxes = [];

	let reader = new FileReader();
	reader.readAsText(file);

	reader.onload = function() {
		let result = reader.result;
		let nameArray;

		clearChildren("studentList");

		nameArray = result.split(/\r?\n/).filter(element => element);
		if (nameArray[0] == "First MI Last") {
			nameArray.shift();
		}

		nameArray.forEach(formattedName => {
			names.push(formattedName);
			if (buildingList) {
				addListElement(formattedName);
			}
		});

		localStorage.setItem(classListName, names);
		listOfClassLists.set(classListName, names);

		if (buildingList) {
			clearChildren("dropDown");
			buildOptions();
			document.getElementById("dropDown").value = classListName;
		} else {
			editList(classListName, listOfClassLists.size - 1);
		}
	}
}

/*
Helper function which removes all child elements from an HTML element, given the parent's ID. Used for refreshing
the drop-down list after a new class is created.
*/
function clearChildren(id) {
	let list = document.getElementById(id);

	while (list.firstChild) {
		list.removeChild(list.firstChild);
	}
}

/*
Helper function called by the parseFile method for every name it processes. Creates the HTML elements to display 
each student name along with a checkbox.
*/
function addListElement(name) {
	let list = document.getElementById("studentList");

	let listItem = document.createElement("li");
	let checkbox = document.createElement("input");

	checkbox.type = "checkbox";
	checkbox.checked = "true";
	checkbox.style = "float: right; margin-right: 30px; margin-top: 6px; background: red;"
	checkboxes.push(checkbox);

	listItem.appendChild(document.createTextNode(name));
	listItem.appendChild(checkbox)

	list.appendChild(listItem);
}

/*
Event handler function, called when a user presses the "Generate groups" button. Removes unchecked boxes, runs
the grouping algorithm, and updates the HTML display.
*/
function generateGroups() {
	let groupSize = parseInt(document.getElementById("groupSize").value);
	groupingName = document.getElementById("groupingName").value;

	if (groupSize > 0) {

		removeAbsent();
		shuffleNameList();

		grouping = makeGroups(groupSize);

		buildGroupView();
		showViewMenu();

		saved = false;
	} else {
		alert("Group size must be positive");
	}
}

/*
Helper function called by the generateGroups() function to remove any students with unchecked boxes, so they will
not be considered in the final grouping. 
*/
function removeAbsent() {
	let j = 0;
	for (let i = 0; i < checkboxes.length; i++) {
		if (checkboxes[i].checked === false) {
			checkboxes[i].checked = true;
			names.splice(j, 1);
			j -= 1;
		}
		j++;
	}
}

/*
Helper function called by the generateGroups() function to shuffle the list of student names.
*/
function shuffleNameList() {
	for (let i = 0; i < (names.length - 1); i++) {
		let randomIndex = i + Math.floor(Math.random() * (names.length - i));
		[names[i], names[randomIndex]] = [names[randomIndex], names[i]];
	}
}

/*
Helper function called by the generateGroups() function which does the actual grouping.
*/
function makeGroups(groupSize) {
	let groups = [];

	for (let i = 0; i < names.length; i += groupSize) {
		if ((i + (2 * groupSize) - 1 < names.length) || i + groupSize === names.length) {
			let arr = names.slice(i, i + groupSize);
			groups.push(arr);
		} else {
			let arr = names.slice(i, names.length);

			if (groupSize === 2) {
				groups.push(arr);
			} else {
				let arr1 = arr.slice(0, arr.length / 2);
				let arr2 = arr.slice(arr.length / 2, arr.length);

				groups.push(arr2);
				groups.push(arr1);
			}

			break;
		}
	}
	return groups;
}

/*
Helper function which creates the HTML elements to display the final grouping.
*/
function buildGroupView() {
	let div = document.getElementById("groupingBox");
	if (div.firstChild) {
		clearChildren("groupingBox");
	}

	for (let i = 0; i < grouping.length; i++) {
		let figure = document.createElement("figure");

		let figcaption = document.createElement("figcaption");
		figcaption.innerHTML = `Team ${i + 1}`;

		let ul = document.createElement("ul");
		ul.style = "width: 200px;";

		for (let name of grouping[i]) {
			let li = document.createElement("li");
			li.appendChild(document.createTextNode(name));
			ul.appendChild(li);
		}

		figure.appendChild(figcaption);
		figure.appendChild(ul);

		div.appendChild(figure);
	}
}

/*
Event handler function called whenever a user clicks the rename button. Renames their current grouping; who
could've guessed.
*/
function renameGrouping() {
	let newName = prompt("Enter the new name for this grouping", groupingName);
	if (!(newName == null || newName == "")) {
		groupingName = newName;
	}
	document.getElementById("mainHeader").innerHTML = groupingName;
}

/*
Event handler function called whenever a user clicks the save button. Saves current grouping as a plain text file.
*/
function saveGrouping() {
	let groupingText = groupingName + "\n\n";
	for (let i = 0; i < grouping.length; i++) {
		groupingText += `Team ${i + 1}:\n`;
		for (let name of grouping[i]) {
			groupingText += name + "\n";
		}
		groupingText += "\n";
	}

	let file = new File([groupingText], { type: "text/plain" });

	let textFile = window.URL.createObjectURL(file);

	let a = document.createElement("a");
	a.href = textFile;

	let groupingNameFile = groupingName.toLowerCase();
	let index = groupingNameFile.indexOf(" ");
	do {
		groupingNameFile = groupingNameFile.replace(" ", '-');
		index = groupingNameFile.indexOf(" ");
	} while (index !== -1);

	let downloadName = prompt("Name your file", `${groupingNameFile}.txt`);

	if (!(downloadName == null || downloadName == "")) {
		a.download = downloadName;

		a.click();
		URL.revokeObjectURL(a.href);

		saved = true;
	}
}

/*
Event handler function called whenever a user clicks the new grouping button. Checks for confirmation from the 
user, then simply reloads the page.
*/
function newGrouping() {
	if (!saved) {
		let loadNew = confirm("You haven't saved your current grouping. Are you sure you want to start over?");
		if (loadNew) {
			location.reload();
		}
	} else {
		let loadNew = confirm("Are you sure you want to start over?");
		if (loadNew) {
			location.reload();
		}
	}
}

/*
Event handler function called when a user clicks the "Edit classes" button. Pulls up the menu for editing their
saved class lists.
*/
function editClassMenu() {
	showEditClassMenu(true);
	buildClassListView();
}

/*
Helper function called by the editClassMenu function which builds the menu for editing saved class lists.
*/
function buildClassListView() {
	let list = document.getElementById("listOfClasses");

	let index = 0;
	for (let className of listOfClassLists.keys()) {
		let li = document.createElement("li");
		li.style = "height: 30px; overflow: hidden;";
		if (className.length > 15) {
			let trimmed = className.slice(0, 12) + "...";
			li.appendChild(document.createTextNode(trimmed));
		} else {
			li.appendChild(document.createTextNode(className));
		}

		let editButton = document.createElement("input");
		let renameButton = document.createElement("input");
		let deleteButton = document.createElement("input");

		let thisIndex = index;

		editButton.type = "button";
		editButton.value = "Edit";
		editButton.onclick = function() { editList(className, thisIndex) };
		editButton.style = "color: blue; font-weight: bold; background: transparent; border: none; float: right;";

		deleteButton.type = "button";
		deleteButton.value = "Delete";
		deleteButton.onclick = function() { deleteList(className, thisIndex) };
		deleteButton.style = "color: blue;  font-weight: bold; background: transparent; border: none; float: right; margin-right: 40px;";

		renameButton.type = "button";
		renameButton.value = "Rename";
		renameButton.onclick = function() { renameList(className, true, thisIndex) };
		renameButton.style = "color: blue;  font-weight: bold; background: transparent; border: none; float: right; margin-left: 5px; margin-right: 5px;";

		li.appendChild(deleteButton);
		li.appendChild(renameButton);
		li.appendChild(editButton);
		list.appendChild(li);

		index++;
	}
}

/*
Helper function which shows the specific options for creating a new class list.
*/
function showNewClassOptions() {
	document.getElementById("newClassButton").style.display = "none";
	document.getElementById("newClassCancel").style.display = "inline-block";
	document.getElementById("newClassFromFile").style.display = "inline-block";
	document.getElementById("newClassFromScratch").style.display = "inline-block";
}

/*
Helper function which hides the specific options for creating a new class list.
*/
function hideNewClassOptions() {
	document.getElementById("newClassButton").style.display = "inline-block";
	document.getElementById("newClassCancel").style.display = "none";
	document.getElementById("newClassFromFile").style.display = "none";
	document.getElementById("newClassFromScratch").style.display = "none";
}

/*
Event handler function which allows the user to create a new empty class list, which they can immediately start editing.
*/
function newClassFromScratch() {
	let listName = prompt("Choose a name for this class list", `Period ${listOfClassLists.size + 1}`);
	if (listName == null || listName == "") {
		return;
	}
	let list = [];
	if (listOfClassLists.has(listName)) {
		let overwrite = confirm(`You have already uploaded a class list called ${listName}. Saving a new list with the same name will overwrite the old data. Do you wish to continue?`)
		if (!overwrite) {
			return;
		}
	}

	localStorage.setItem(listOfClassLists.size, listName);
	localStorage.setItem(listName, list);
	listOfClassLists.set(listName, list);

	editList(listName, listOfClassLists.size - 1);
}

/*
Event handler function which allows a user to upload a new class list from a .csv file. 
*/
function newClassFromFile() {
	document.getElementById("fileSelectEdit").click();
}

/*
Event handler function called immediately after the user has chosen a file to upload after execucting the previous function.
Calls the helper functions to parse this file.
*/
function fileSelectedForEditMenu() {
	let fileSelect = document.getElementById("fileSelectEdit");
	let file = fileSelect.files[0];
	let proceed = checkForValidFileInput(file);

	if (proceed) {
		parseFile(file, false);
	}
}

/*
Event handler function which brings up the menu for editing a single class list.
*/
function editList(className, thisIndex) {
	showStudentListMenu(className);
	let classList = listOfClassLists.get(className);
	buildStudentListView(className, classList, thisIndex);
}

/*
Helper function which builds the HTML for editing a single class list.
*/
function buildStudentListView(className, classList, thisIndex) {
	let list = document.getElementById("listOfClasses");
	document.getElementById("newStudentButton").onclick = function() { newStudent(className, classList, thisIndex) };
	document.getElementById("renameListButton").onclick = function() { renameList(className, false, thisIndex) };
	document.getElementById("deleteListButton").onclick = function() { deleteList(className, thisIndex) };
	document.getElementById("sortListButton").onclick = function() { sortList(className, classList, thisIndex) };

	let index = 0;
	for (let student of classList) {
		let li = document.createElement("li");
		li.style = "height: 30px;";
		if (student.length > 20) {
			let trimmed = student.slice(0, 17) + "...";
			li.appendChild(document.createTextNode(trimmed));
		} else {
			li.appendChild(document.createTextNode(student));
		}

		let removeButton = document.createElement("input");
		let thisIndex = index;

		removeButton.type = "button";
		removeButton.value = "Remove";
		removeButton.onclick = function() { removeStudent(student, thisIndex, className, classList, thisIndex) };
		removeButton.style = "color: blue;  font-weight: bold; background: transparent; border: none; float: right; margin-right: 30px;";

		let renameButton = document.createElement("input");

		renameButton.type = "button";
		renameButton.value = "Rename";
		renameButton.onclick = function() { renameStudent(student, thisIndex, className, classList, thisIndex) };
		renameButton.style = "color: blue;  font-weight: bold; background: transparent; border: none; float: right; margin-right: 5px;";

		li.appendChild(removeButton);
		li.appendChild(renameButton);
		list.appendChild(li);

		index++;
	}
}

/*
Event handler function which goes back to the list of class lists from editing a single list.
*/
function backToList() {
	showEditClassMenu(false);
	buildClassListView();
}

/*
Event handler function which allows the user to add a new student to the class being edited.
*/
function newStudent(className, classList, classIndex) {
	let newStudentName = prompt("Enter this student's name");
	if (!(newStudentName == null || newStudentName == "")) {
		classList.push(newStudentName);

		listOfClassLists.set(className, classList);
		localStorage.setItem(className, classList);

		if (classList.length == 1) {
			showStudentListMenu(className);
		}

		let list = document.getElementById("listOfClasses");
		let li = document.createElement("li");
		li.style = "height: 30px;";
		if (newStudentName.length > 20) {
			let trimmed = newStudentName.slice(0, 17) + "...";
			li.appendChild(document.createTextNode(trimmed));
		} else {
			li.appendChild(document.createTextNode(newStudentName));
		}

		let removeButton = document.createElement("input");

		removeButton.type = "button";
		removeButton.value = "Remove";
		removeButton.onclick = function() { removeStudent(newStudentName, classList.length - 1, className, classList, classIndex) };
		removeButton.style = "color: blue;  font-weight: bold; background: transparent; border: none; float: right; margin-right: 30px;";

		let renameButton = document.createElement("input");

		renameButton.type = "button";
		renameButton.value = "Rename";
		renameButton.onclick = function() { renameStudent(newStudentName, classList.length - 1, className, classList, classIndex) };
		renameButton.style = "color: blue;  font-weight: bold; background: transparent; border: none; float: right; margin-right: 5px;";


		li.appendChild(removeButton);
		li.appendChild(renameButton);
		list.appendChild(li);
	}
}

/*
Event handler function which allows the user to remove a student from the class being edited.
*/
function removeStudent(student, thisIndex, className, classList, classIndex) {
	if (confirm(`Remove ${student} from ${className}?`)) {
		classList.splice(thisIndex, 1);
		updateChangedClassList(className, classList, classIndex);
	}
}

/*
Event handler function which allows the user to rename a student in the class being edited.
*/
function renameStudent(student, thisIndex, className, classList, classIndex) {
	let newName = prompt(`Enter the new name for ${student}`, student);

	if (newName == student) {
		return;
	}

	if (!(newName == null || newName == "")) {
		classList[thisIndex] = newName;
	}
	updateChangedClassList(className, classList, classIndex);
}

/*
Event handler function which allows the user to rename a given class list.
*/
function renameList(className, fromListOfClasses, classIndex) {
	let newName = prompt(`Enter the new name for ${className}`, className);

	while (listOfClassLists.has(newName)) {
		if (newName == className) {
			return;
		}
		newName = prompt("Please enter a unique class name", newName);
	}

	if (!(newName == null || newName == "")) {
		let index = 0;
		while (true) {
			let thisListName = localStorage.getItem(index.toString()).toString();
			if (thisListName == className) {
				localStorage.removeItem(index.toString());
				localStorage.setItem(index, newName);
				break;
			}
			index++;
		}

		let thisList = listOfClassLists.get(className);
		localStorage.removeItem(className);
		localStorage.setItem(newName, thisList);
		buildListOfClassLists();
		clearChildren("listOfClasses");
		if (fromListOfClasses) {
			buildClassListView();
		} else {
			document.getElementById("mainHeader").innerHTML = newName;
			buildStudentListView(newName, thisList, classIndex);
		}
	}
}

/*
Event handler function which allows the user to delete a given list from their memory.
*/
function deleteList(className, listIndex) {
	if (confirm(`Are you sure you want to delete ${className}?`)) {
		let size = listOfClassLists.size - 1;
		listOfClassLists.delete(className);

		let index = 0;
		let adjusting = false;
		while (true) {
			if (adjusting) {
				if (index > size) {
					break;
				}
				localStorage.setItem(index - 1, localStorage.getItem(index.toString()));
				localStorage.removeItem(index.toString());
			} else {
				let thisListName = localStorage.getItem(index.toString()).toString();
				if (thisListName == className) {
					localStorage.removeItem(index.toString());
					adjusting = true;
				}
			}
			index++;
		}

		localStorage.removeItem(className);

		clearChildren("listOfClasses");

		showEditClassMenu(false);
		buildClassListView();
	}
}

/*
Event handler function which sorts the list being edited alphabetically. Users can add as many students as they want, then
click this button to maintain student order.
*/
function sortList(className, classList, classIndex) {
	classList = classList.sort(
		function(a, b) {
			a = (a.slice(a.indexOf(' ') + 1) + a.slice(0, a.indexOf(' ') + 1)).toLowerCase();
			b = (b.slice(b.indexOf(' ') + 1) + b.slice(0, b.indexOf(' ') + 1)).toLowerCase();
			if (a < b) {
				return -1;
			}
			if (a > b) {
				return 1;
			}
			return 0;
		}
	);
	updateChangedClassList(className, classList, classIndex);
}

/*
Helper function called by the removeStudent, renameStudent, and sortList functions after they perform their respective tasks. Updates the
changes to the class list both in memory and on the HTML page
*/
function updateChangedClassList(className, classList, classIndex) {
	listOfClassLists.set(className, classList);
	localStorage.setItem(className, classList);

	clearChildren("listOfClasses");

	if (classList.length == 0) {
		showStudentListMenu(className);
	}
	buildStudentListView(className, classList, classIndex);
}

function home() {
	location.reload();
}

/* 
Helper function called by the fileSelected function which alters the HTML display to show the necessary elements
for configuring a list of students after uploading a file.
*/
function showConfigurationMenu() {
	document.getElementById("dropDownLabel").style.display = "none";
	document.getElementById("dropDown").style.display = "none";
	document.getElementById("dropDownSubmit").style.display = "none";
	document.getElementById("mainDescription").innerHTML = `It\'s time to create teams for ${classListName}! First, deselect any students who aren't here today.<br> Then choose the size of each team, and pick a name for these teams.`;
	document.getElementById("mainHeader").innerHTML = "Generate Teams";
	document.getElementById("groupingName").value = `${classListName} Teams`;

	document.getElementById("studentList").style.display = "inline-block";
	document.getElementById("sizeLabel").style.display = "inline-block";
	document.getElementById("groupSize").style.display = "inline-block";
	document.getElementById("nameLabel").style.display = "inline-block";
	document.getElementById("groupingName").style.display = "inline-block";
	document.getElementById("generateButton").style.display = "inline-block";

	document.getElementById("b1").style.display = "inline-block";
	document.getElementById("b3").style.display = "inline-block";
	document.getElementById("b4").style.display = "inline-block";
	document.getElementById("b5").style.display = "inline-block";
	document.getElementById("b6").style.display = "inline-block";
	document.getElementById("b7").style.display = "inline-block";
	document.getElementById("b8").style.display = "inline-block";
	document.getElementById("b9").style.display = "inline-block";
	document.getElementById("b10").style.display = "inline-block";

	document.getElementById("or").style.display = "none";
	document.getElementById("editClasses").style.display = "none";
	document.getElementById("backButtonConfiguration").style.display = "inline-block";
}

/*
Helper function which hides the HTML elements for the class list picking menu
*/
function hidePickListMenu() {
	document.getElementById("dropDownLabel").style.display = "none";
	document.getElementById("dropDown").style.display = "none";
	document.getElementById("dropDownSubmit").style.display = "none";
	document.getElementById("b12").style.display = "none";
	document.getElementById("b13").style.display = "none";
	document.getElementById("b14").style.display = "none";
	document.getElementById("b15").style.display = "none";
	document.getElementById("or").style.display = "none";
	document.getElementById("editClasses").style.display = "none";
}

/*
Helper function called by the fileSelected function which alters the HTML display to hide the configuration menu,
then show the necessary elements for vewing the final grouping.
*/
function showViewMenu() {
	hidePickListMenu();

	document.getElementById("studentList").style.display = "none";
	document.getElementById("sizeLabel").style.display = "none";
	document.getElementById("groupSize").style.display = "none";
	document.getElementById("nameLabel").style.display = "none";
	document.getElementById("groupingName").style.display = "none";
	document.getElementById("generateButton").style.display = "none";

	document.getElementById("b1").style.display = "none";
	document.getElementById("b3").style.display = "none";
	document.getElementById("b4").style.display = "none";
	document.getElementById("b5").style.display = "none";
	document.getElementById("b6").style.display = "none";
	document.getElementById("b7").style.display = "none";
	document.getElementById("b8").style.display = "none";
	document.getElementById("b9").style.display = "none";
	document.getElementById("b10").style.display = "none";
	document.getElementById("mainHeader").innerHTML = groupingName;
	document.getElementById("mainDescription").innerHTML = "";

	document.getElementById("backButtonConfiguration").style.display = "none";
	document.getElementById("groupingBox").style.display = "block";
	document.getElementById("renameButton").style.display = "inline-block";
	document.getElementById("reshuffleButton").style.display = "inline-block";
	document.getElementById("saveButton").style.display = "inline-block";
	document.getElementById("newButton").style.display = "inline-block";

	document.getElementById("b22").style.display = "inline-block";
	document.getElementById("b23").style.display = "inline-block";
	document.getElementById("b24").style.display = "inline-block";
	document.getElementById("b25").style.display = "inline-block";
}

/*
Helper function which builds the HTML for viewing the user's  list of classes. The firstTime boolean paramter allows the function
to affect different elements based on where in the program it is called from.
*/
function showEditClassMenu(firstTime) {
	if (firstTime) {
		hidePickListMenu();
	} else {
		clearChildren("listOfClasses");
		document.getElementById("backToListButton").style.display = "none";
		document.getElementById("newStudentButton").style.display = "none";
		document.getElementById("renameListButton").style.display = "none";
		document.getElementById("deleteListButton").style.display = "none";
		document.getElementById("sortListButton").style.display = "none";
		document.getElementById("b26").style.display = "none";
	}
	document.getElementById("mainHeader").innerHTML = "Your classes";
	document.getElementById("mainDescription").innerHTML = "Any classes you create or modify here will be saved for future team groupings."
	if (listOfClassLists.size == 0) {
		document.getElementById("mainDescription").innerHTML += `<br>Get started by building a class from scratch, or by uploading a .csv file.`
		document.getElementById("listOfClasses").style.display = "none";
		document.getElementById("b20").style.display = "none";
	} else {
		document.getElementById("listOfClasses").style.display = "inline-block";
		document.getElementById("b20").style.display = "inline-block";
	}
	document.getElementById("backButton").style.display = "inline-block";
	document.getElementById("b18").style.display = "inline-block";
	document.getElementById("b19").style.display = "inline-block";
	document.getElementById("newClassButton").style.display = "inline-block";
}

/*
Helper function which builds the HTML for editing a single class list.
*/

function showStudentListMenu(className) {
	clearChildren("listOfClasses");

	document.getElementById("mainHeader").innerHTML = className;
	if (listOfClassLists.get(className).length == 0) {
		document.getElementById("mainDescription").innerHTML = "This class is empty.";
		document.getElementById("listOfClasses").style.display = "none";
		document.getElementById("b20").style.display = "none";
		document.getElementById("sortListButton").style.display = "none";
	} else {
		document.getElementById("mainDescription").innerHTML = "";
		document.getElementById("listOfClasses").style.display = "inline-block";
		document.getElementById("b20").style.display = "inline-block";
		document.getElementById("sortListButton").style.display = "inline-block";
	}

	document.getElementById("backToListButton").style.display = "inline-block";
	document.getElementById("backButton").style.display = "none";
	document.getElementById("newClassButton").style.display = "none";
	document.getElementById("newClassCancel").style.display = "none";
	document.getElementById("newClassFromScratch").style.display = "none";
	document.getElementById("newClassFromFile").style.display = "none";
	document.getElementById("newStudentButton").style.display = "inline-block";
	document.getElementById("renameListButton").style.display = "inline-block";
	document.getElementById("deleteListButton").style.display = "inline-block";
	document.getElementById("b20").style.display = "inline-block";
	document.getElementById("b26").style.display = "inline-block";
}