'use strict';

const Bluebird = require('bluebird');
const Bcrypt   = Bluebird.promisifyAll(require('bcrypt'));
const Slug     = require('slug');

const Config = require('../../../../config');
const Dex    = require('../../../models/dex');
const Errors = require('../../../libraries/errors');
const JWT    = require('../../../libraries/jwt');
const Knex   = require('../../../libraries/knex');
const User   = require('../../../models/user');

exports.list = function (query) {
  return new User().query((qb) => {
    qb.orderBy('id', 'DESC');
    qb.limit(query.limit);
    qb.offset(query.offset);
  })
  .fetchAll({ withRelated: User.RELATED });
};

exports.retrieve = function (username) {
  return new User().where('username', username).fetch({ require: true, withRelated: User.RELATED })
  .catch(User.NotFoundError, () => {
    throw new Errors.NotFound('user');
  });
};

exports.create = function (payload, request) {
  return Bcrypt.hashAsync(payload.password, Config.SALT_ROUNDS)
  .then((hash) => {
    payload.password = hash;

    return new User().where('username', payload.username).fetch();
  })
  .then((existing) => {
    if (existing) {
      throw new Errors.ExistingUsername();
    }

    const xff = request.headers['x-forwarded-for'];
    const ip = xff ? xff.split(',')[0].trim() : request.info.remoteAddress;

    return Knex.transaction((transacting) => {
      return new User().save({
        username: payload.username,
        password: payload.password,
        friend_code: payload.friend_code,
        referrer: payload.referrer,
        last_ip: ip
      }, { transacting })
      .tap((user) => {
        return new Dex().save({
          user_id: user.id,
          title: payload.title,
          slug: Slug(payload.title, { lower: true }),
          shiny: payload.shiny,
          generation: payload.generation
        }, { transacting });
      });
    });
  })
  .then((user) => user.refresh({ withRelated: User.RELATED }))
  .then((user) => JWT.sign(user))
  .catch(Errors.DuplicateKey, () => {
    throw new Errors.ExistingUsername();
  });
};

exports.update = function (username, payload, auth) {
  return Bluebird.resolve()
  .then(() => {
    if (payload.password) {
      return Bcrypt.hashAsync(payload.password, Config.SALT_ROUNDS)
      .then((hash) => payload.password = hash);
    }
  })
  .then(() => new User({ id: auth.id }).where('username', username).save(payload))
  .then((user) => user.refresh({ withRelated: User.RELATED }))
  .then((user) => JWT.sign(user))
  .catch(User.NoRowsUpdatedError, () => {
    throw new Errors.ForbiddenAction('updating this user');
  });
};
