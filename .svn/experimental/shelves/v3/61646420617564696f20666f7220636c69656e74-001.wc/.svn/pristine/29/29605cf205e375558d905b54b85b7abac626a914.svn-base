const input = document.querySelector('#userDropList');
const suggestions = document.querySelector('.suggestions ul');
let suggestionsLi = document.querySelectorAll('.drop-li');
let currentUser;
let currentLi;
let currentIndex = 0;

function search(str) {
	let results = [];
	const val = str.toLowerCase();

	for (i = 0; i < userDropList.length; i++) {
		if (userDropList[i].toLowerCase().indexOf(val) > -1) {
			results.push(userDropList[i]);
		}
	}

	return results;
}

function searchHandler(e) {    
	const inputVal = e.currentTarget.value;
	let results = [];
	if (inputVal.length > 0) {
		results = search(inputVal);
	}
	showSuggestions(results, inputVal);
    checkUpDownArrow(e);    
}

function checkUpDownArrow(e) { 
    suggestionsLi = suggestions.querySelectorAll('li'); 
    if(e.code === "ArrowDown"){
        if(currentIndex == suggestionsLi.length || currentIndex < 0) {
            currentIndex = 0;
        } else {
            currentIndex++;
        }
        currentLi = suggestions.querySelector('li:nth-child('+currentIndex+')');
    } else if(e.code === "ArrowUp"){
        if(currentIndex == 1 || currentIndex > suggestionsLi.length) {
            currentIndex = suggestionsLi.length;
        } else {
            currentIndex--;
        }
        currentLi = suggestions.querySelector('li:nth-child('+currentIndex+')');
    } else {
        return;
    }    
    currentLi.classList.add("highlight");
}

function showSuggestions(results, inputVal) {
    
    suggestions.innerHTML = '';

	if (results.length > 0) {
		for (i = 0; i < results.length; i++) {
			let item = results[i];
			// Highlights only the first match
			// TODO: highlight all matches
			const match = item.match(new RegExp(inputVal, 'i'));
			item = item.replace(match[0], `<strong>${match[0]}</strong>`);
			suggestions.innerHTML += `<li class="drop-li">${item}</li>`;
		}
		suggestions.classList.add('has-suggestions');
	} else {
		results = [];
		suggestions.innerHTML = '';
		suggestions.classList.remove('has-suggestions');
	}
}

function useSuggestion(e) {
	input.value = e.target.innerText;
	input.focus();
	suggestions.innerHTML = '';
	suggestions.classList.remove('has-suggestions');

    //select to Tên người chơi
    let element = document.getElementById("user-select");
    element.value = e.target.innerText;
    logout();
}

input.addEventListener('keyup', searchHandler);
suggestions.addEventListener('click', useSuggestion);