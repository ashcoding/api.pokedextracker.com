'use strict';

const JWT = require('jsonwebtoken');

const Config = require('../../../../config');
const Knex   = require('../../../../src/libraries/knex');
const Server = require('../../../../src/server');

const user = Factory.build('user');

const dex = Factory.build('dex', { user_id: user.id });

const auth = `Bearer ${JWT.sign(user, Config.JWT_SECRET)}`;

describe('dexes integration', () => {

  describe('retrieve', () => {

    beforeEach(() => {
      return Knex('users').insert(user)
      .then(() => Knex('dexes').insert(dex));
    });

    it('returns a dex from the username and slug', () => {
      return Server.inject({
        method: 'GET',
        url: `/users/${user.username}/dexes/${dex.slug}`
      })
      .then((res) => {
        expect(res.statusCode).to.eql(200);
      });
    });

  });

  describe('create', () => {

    beforeEach(() => {
      return Knex('users').insert(user);
    });

    it('saves a dex', () => {
      return Server.inject({
        method: 'POST',
        url: `/users/${user.username}/dexes`,
        headers: { authorization: auth },
        payload: {
          title: 'Testing',
          shiny: false,
          generation: 6
        }
      })
      .then((res) => {
        expect(res.statusCode).to.eql(200);
      });
    });

    it('requires authentication', () => {
      return Server.inject({
        method: 'POST',
        url: `/users/${user.username}/dexes`,
        payload: {
          title: 'Testing',
          shiny: false,
          generation: 6
        }
      })
      .then((res) => {
        expect(res.statusCode).to.eql(401);
      });
    });

  });

  describe('update', () => {

    beforeEach(() => {
      return Knex('users').insert(user)
      .then(() => Knex('dexes').insert(dex));
    });

    it('updates a dex', () => {
      return Server.inject({
        method: 'POST',
        url: `/users/${user.username}/dexes/${dex.slug}`,
        headers: { authorization: auth },
        payload: { title: 'Testing' }
      })
      .then((res) => {
        expect(res.statusCode).to.eql(200);
      });
    });

    it('requires authentication', () => {
      return Server.inject({
        method: 'POST',
        url: `/users/${user.username}/dexes/${dex.slug}`,
        payload: { title: 'Testing' }
      })
      .then((res) => {
        expect(res.statusCode).to.eql(401);
      });
    });

  });

  describe('delete', () => {

    beforeEach(() => {
      return Knex('users').insert(user)
      .then(() => Knex('dexes').insert(dex));
    });

    it('deletes a dex', () => {
      return Server.inject({
        method: 'DELETE',
        url: `/users/${user.username}/dexes/${dex.slug}`,
        headers: { authorization: auth }
      })
      .then((res) => {
        expect(res.statusCode).to.eql(200);
      });
    });

    it('requires authentication', () => {
      return Server.inject({
        method: 'DELETE',
        url: `/users/${user.username}/dexes/${dex.slug}`
      })
      .then((res) => {
        expect(res.statusCode).to.eql(401);
      });
    });

  });

});
