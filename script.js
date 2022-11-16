'use strict';

// prettier-ignore
//----------------------------------------------------------------------------
//----------------------------------------------------------------------------

//Selections

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//----------------------------------------------------------------------------
//----------------------------------------------------------------------------

//SELF CHALLENGE

//----------------------------------------------------------------------------

//Implementing classes to handle activity data

//Parent class
class Workout {
  //Defining the Date of the workout
  date = new Date();

  //Defining an ID for each workout
  id = (Date.now() * Math.floor(Math.random() * 10 + 1) + '').slice(-10);

  //Defining a clicks field to use it on a public interface
  clicks = 0;

  constructor(coords, distance, duration, type) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //In km
    this.duration = duration; //In minutes
    this.type = type;
  }

  //Method to set the description of the workout
  _setDescription() {
    //prettier-ignore
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

//Child classes

//Running extends Workout
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();

    //We have to call the setDescription method inside each instance because it contains the type
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    //We have to call the setDescription method inside each instance because it contains the type
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
//Defining the App class - Will hold the methods

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  //The constructor is used to invoke init methods and to set the event listeners
  constructor() {
    //Get users position
    this._getPosition();

    //Get data from the local storage
    this._getLocalStorage();
    //Attaching event handlers

    //Add an event listener to invoke the _newWorkout() method when the form gets submitted
    form.addEventListener('submit', this._newWorkout.bind(this));

    //Add an event listener to invoke the _toggleElevation() method when we change the workout type on the selector
    inputType.addEventListener('change', this._toggleElevation);

    //Add a delegated event listener to invoke the _goToMarker() marker when we click on a workout item on the sidebar
    containerWorkouts.addEventListener('click', this._goToMarker.bind(this));
  }

  //Method to get the user position and to call the _loadMap
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("We're unable to get your position");
        }
      );
    }
  }

  //Method to render the map on the current position and set the #map private field
  _loadMap(location) {
    const { latitude, longitude } = location.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    //Calling the methods to render workout marker and list item after _loadMap() is executed and #map is defined

    this.#workouts.forEach(workout => {
      this._renderWorkoutList(workout);
      this._renderWorkoutMarker(workout);
    });

    //Rendering the map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Event listener to call the _showForm passing the location of the click as the argument
    this.#map.on('click', this._showForm.bind(this));
  }

  //Method to show the form and set the #mapEvent private field
  _showForm(mapEvent) {
    inputDistance.focus();
    this.#mapEvent = mapEvent;
    form.classList.remove('hidden');
  }

  //Method to hide the form after submiting it on the _newWorkout()
  _hideForm() {
    //Set the display of the form to none
    form.style.display = 'none';
    form.classList.add('hidden');

    //Than after 1 second reset the display to grid to get the desired animation
    setTimeout(() => (form.style.display = 'grid'), 1000);

    //Clear the input fields
    //prettier-ignore
    inputDuration.value = inputDistance.value = inputCadence.value = inputElevation.value ='';
  }

  //Method to define everything about the new workout and create the instance of the corresponding workout type
  _newWorkout(event) {
    event.preventDefault();

    //Creating a helper function to validate the inputs
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    //Creating a helper function to validate the inputs
    const validateInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    //Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat: latitude, lng: longitude } = this.#mapEvent.latlng;
    let workout;

    // If Workout = Running - Create a running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //Check if data is valid - By calling the helper functions - Guard clause
      if (
        !validateInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      //Defining the new workout Object as cycling to be pushed to the #workouts array
      workout = new Running([latitude, longitude], distance, duration, cadence);
    }

    //If Workout = Cycling - Create a cycling Object

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      //Check if data is valid - By calling the helper functions
      if (
        !validateInputs(distance, duration, elevationGain) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');
      //Defining the new workout Object as cycling to be pushed to the #workouts array
      workout = new Cycling(
        [latitude, longitude],
        distance,
        duration,
        elevationGain
      );
    }

    //Delegating functionality from other methods to the _newWorkout() method

    //Add the new object to the workout array
    this.#workouts.push(workout);

    // Hide form and clear the input fields
    this._hideForm();

    //Render the workout into the sidebar
    this._renderWorkoutList(workout);

    //Render a marker containing the workout info on the map
    this._renderWorkoutMarker(workout);

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  //Method to toggle the form__row--hidden both on the inputCadence and inputElevation
  _toggleElevation() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //Render the Workout as a marker on the map
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
  }

  //Method to render the card of the workouts on the app sidebar
  _renderWorkoutList(workout) {
    let commonHtml = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance} Km</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
`;

    if (workout.type === 'running') {
      commonHtml += ` 
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }

    if (workout.type === 'cycling') {
      commonHtml += ` 
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }

    form.insertAdjacentHTML('afterend', commonHtml);
  }

  _goToMarker(event) {
    //Getting the target of the click event
    const workoutElement = event.target.closest('.workout');

    //Guard clause to return if there's no closest .workout
    if (!workoutElement) return;

    //getting the data from the clicked workout
    const workoutData = this.#workouts.find(
      workout => workout.id === workoutElement.dataset.id
    );

    this.#map.setView(workoutData.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    //Using the public interface to count how many clicks there were on the workout

    //Can't use the click method because when we converted the object to a string on the localStorage, we lost the prototype chain

    // this.workoutData.click();
  }

  _setLocalStorage() {
    //The local storage is a simple API. the set item get's two arguments: Key and Value(str). For the value we convert an object to a string using the JSON.stringify() method
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  //Getting the objects from the local storage by using the key and using the JSON.parse method to transform the data string back to object
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
  }

  //Public method to clear the local storage and reload the page
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

//Creating an instance of the App class
const app = new App();
