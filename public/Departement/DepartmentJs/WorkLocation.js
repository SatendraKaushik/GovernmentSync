async function getCitiesFromProjects() {
    try {
        const response = await fetch('/projects');
        const projects = await response.json();
        if (projects.length > 0) {
            return projects;
        } else {
            throw new Error("No projects found");
        }
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
}

async function getCityCoordinates(city) {
    try {
        const response = await fetch(`/getCityCoordinates?city=${encodeURIComponent(city)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching coordinates for city ${city}:`, error);
        return {};
    }
}

function loadMapScenario() {
    console.log('Loading map scenario...');
    
    getCitiesFromProjects().then(projects => {
        if (projects.length === 0) {
            console.error("No cities to display on the map");
            return;
        }
        
        const map = new Microsoft.Maps.Map('#map', {
            center: new Microsoft.Maps.Location(0, 0),
            zoom: 5,
            mapTypeId: Microsoft.Maps.MapTypeId.aerial 
        });

        console.log('Map initialized');

        const imagePopup = document.getElementById('image-popup');
        
        // Group projects by city to determine the color of pushpins
        const cityProjectsMap = projects.reduce((acc, project) => {
            if (!acc[project.city]) {
                acc[project.city] = [];
            }
            acc[project.city].push(project);
            return acc;
        }, {});
        
        // Fetch coordinates for all unique cities
        const uniqueCities = Object.keys(cityProjectsMap);
        const locationPromises = uniqueCities.map(city => getCityCoordinates(city));
        
        Promise.all(locationPromises).then(coordinatesList => {
            const cityCoordinates = uniqueCities.reduce((acc, city, index) => {
                acc[city] = coordinatesList[index];
                return acc;
            }, {});
            
            uniqueCities.forEach(city => {
                const coordinates = cityCoordinates[city];
                if (coordinates && coordinates.latitude && coordinates.longitude) {
                    const location = new Microsoft.Maps.Location(coordinates.latitude, coordinates.longitude);
                    
                    // Determine color based on the number of projects in the city
                    const color = cityProjectsMap[city].length > 1 ? 'red' : 'blue';
                    
                    const pushpin = new Microsoft.Maps.Pushpin(location, {
                        title: city,
                        color: color
                    });
                    map.entities.push(pushpin);
                    
                    Microsoft.Maps.Events.addHandler(pushpin, 'mouseover', function (e) {
                        if (e.target instanceof Microsoft.Maps.Pushpin) {
                            imagePopup.style.display = 'block';
                            const point = map.tryLocationToPixel(location, Microsoft.Maps.PixelReference.control);
                            imagePopup.style.left = `${point.x}px`;
                            imagePopup.style.top = `${point.y + 1001}px`; // Adjusted offset

                            // Display images of all projects in the city
                            const imagesHtml = cityProjectsMap[city].map(project => 
                                `<img src="${project.image_upload}" alt="Project Image" style="max-width: 100px; max-height: 100px; margin: 5px;">`
                            ).join('');
                            imagePopup.innerHTML = imagesHtml;
                        }
                    });
                    
                    Microsoft.Maps.Events.addHandler(pushpin, 'mouseout', function () {
                        imagePopup.style.display = 'none';
                    });
                    
                    // Adjust map view to include the new location
                    if (uniqueCities.indexOf(city) === 0) {
                        map.setView({ bounds: Microsoft.Maps.LocationRect.fromCorners(location, location) });
                    } else {
                        const bounds = map.getBounds();
                        bounds.extend(location);
                        map.setView({ bounds: bounds });
                    }
                } else {
                    console.error(`Invalid coordinates for city ${city}`);
                }
            });
        }).catch(error => {
            console.error("Error fetching coordinates:", error);
        });
    }).catch(error => {
        console.error("Error fetching projects:", error);
    });
}

window.onload = loadMapScenario;
