const { Pool } = require('pg');
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  let user;
  return pool.query(
    `
    SELECT * 
    FROM users
    WHERE email = $1;
    `,
    [email])
    .then((result) => {
      if (result.rows[0]) {
        user = result.rows[0];
      } else {
        user = null;
      }
      return Promise.resolve(user);
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool.query(`SELECT * FROM users WHERE id = $1;`, [id])
    .then((result) => {
      return Promise.resolve(result.rows[0] || null);
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool.query(
    `
    INSERT INTO users (name, email, password) 
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
    [user.name, user.email, user.password])
    .then((result) => {
      return Promise.resolve(result.rows[0]);
    })
    .catch((err) => {
      console.log('!!' + err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {

  return pool.query(`
      SELECT reservations.*, properties.*, AVG(property_reviews.rating) as average_rating
      FROM property_reviews
      JOIN reservations ON reservation_id = reservations.id
      JOIN properties ON property_reviews.property_id = properties.id
      WHERE reservations.guest_id = $1
      GROUP BY properties.id, reservations.id
      ORDER BY start_date ASC
      LIMIT $2;`, [guest_id, limit])
    .then((result) => result.rows)
    .catch((err) => console.log(err.message));

};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  WHERE 1 = 1
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `AND city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `AND owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {

    let minPrice = parseInt(options.minimum_price_per_night, 10) * 100;
    let maxPrice = parseInt(options.maximum_price_per_night, 10) * 100;

    queryParams.push(minPrice);
    queryString += `AND cost_per_night >=$${queryParams.length}`;
    queryParams.push(maxPrice);
    queryString += `AND cost_per_night <= $${queryParams.length}`;

  }

  queryString += ` GROUP BY properties.id`;

  if (options.minimum_rating) {
    const rating = parseInt(options.minimum_rating);
    queryParams.push(rating);
    queryString += ` HAVING AVG(property_reviews.rating) >= $${queryParams.length}`;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams).then((result) => result.rows);


};


exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const queryParams = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms
  ];

  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
  RETURNING *;`;

  return pool.query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    });
};
exports.addProperty = addProperty;

