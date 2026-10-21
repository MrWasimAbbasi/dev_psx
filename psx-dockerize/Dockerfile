FROM php:7.2-apache

# Debian Buster is EOL; use the archive mirrors so apt still works.
RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list \
    && sed -i 's|security.debian.org|archive.debian.org|g' /etc/apt/sources.list \
    && sed -i '/buster-updates/d' /etc/apt/sources.list \
    && sed -i 's/stable\/updates/stable-security\/updates/' /etc/apt/sources.list \
    && printf 'Acquire::Check-Valid-Until "false";\n' > /etc/apt/apt.conf.d/99no-check-valid-until
RUN apt-get update --fix-missing

RUN mkdir -p /usr/share/man/man1
RUN mkdir -p /usr/share/pdftk

RUN apt-get install -y make openjdk-11-jre libmagickwand-dev git curl libssl-dev libmcrypt-dev libgmp-dev \
    libtidy-dev libpspell-dev libcurl4-gnutls-dev libldap2-dev libc-client-dev libkrb5-dev \
    librecode-dev libsnmp-dev libenchant-dev make python2.7 build-essential && \
    rm -r /var/lib/apt/lists/*

COPY ./pdftk/pdftk.jar /usr/share/pdftk/
COPY ./pdftk/commons-lang3.jar /usr/share/java/
COPY ./pdftk/bcprov-1.58.jar /usr/share/java/

COPY ./pdftk/pdftk /usr/bin
RUN chmod +x /usr/bin/pdftk

RUN apt-get clean

RUN docker-php-ext-configure gmp
RUN docker-php-ext-configure imap --with-kerberos --with-imap-ssl

RUN docker-php-ext-install gmp snmp soap gd enchant recode curl tidy \
    opcache pspell xmlrpc ldap bz2 imap dba intl xml mbstring zip pdo_mysql \
    gmp gd bcmath ctype json tokenizer exif mysqli calendar

RUN curl --silent --show-error https://getcomposer.org/installer | \
    php -- --install-dir=/usr/local/bin --filename=composer

RUN pecl install imagick
# PHP 7.2's pecl client can no longer list releases on pecl.php.net
# ("No releases available for package"). Install the same pinned tarball directly.
RUN curl -fsSL -o /tmp/mongodb-1.9.2.tgz https://pecl.php.net/get/mongodb-1.9.2.tgz \
    && tar -xzf /tmp/mongodb-1.9.2.tgz -C /tmp \
    && cd /tmp/mongodb-1.9.2 \
    && phpize \
    && ./configure \
    && make -j"$(nproc)" \
    && make install \
    && cd / \
    && rm -rf /tmp/mongodb-1.9.2 /tmp/mongodb-1.9.2.tgz \
    && docker-php-ext-enable mongodb

RUN echo "extension=imagick.so" > /usr/local/etc/php/conf.d/ext-imagick.ini && \
    echo "extension=mongodb.so" > /usr/local/etc/php/conf.d/mongodb.ini

ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN a2enmod rewrite

ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 8.17.0
RUN mkdir $HOME/.nvm && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash && \
    chmod +x $HOME/.nvm/nvm.sh && \
    . $HOME/.nvm/nvm.sh && \
    nvm install --latest-npm "$NODE_VERSION" && \
    nvm alias default "$NODE_VERSION" && \
    nvm use default && \
    DEFAULT_NODE_VERSION=$(nvm version default) && \
    ln -sf /root/.nvm/versions/node/$DEFAULT_NODE_VERSION/bin/node /usr/bin/nodejs && \
    ln -sf /root/.nvm/versions/node/$DEFAULT_NODE_VERSION/bin/node /usr/bin/node && \
    ln -sf /root/.nvm/versions/node/$DEFAULT_NODE_VERSION/bin/npm /usr/bin/npm

RUN npm install gulp -g

# Same pecl channel failure as mongodb. xdebug 3.1.5 is the last release that supports PHP 7.2.
RUN curl -fsSL -o /tmp/xdebug-3.1.5.tgz https://pecl.php.net/get/xdebug-3.1.5.tgz \
    && tar -xzf /tmp/xdebug-3.1.5.tgz -C /tmp \
    && cd /tmp/xdebug-3.1.5 \
    && phpize \
    && ./configure \
    && make -j"$(nproc)" \
    && make install \
    && cd / \
    && rm -rf /tmp/xdebug-3.1.5 /tmp/xdebug-3.1.5.tgz \
    && docker-php-ext-enable xdebug