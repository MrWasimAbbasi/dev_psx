FROM php:7.2-apache

RUN sed -i 's/stable\/updates/stable-security\/updates/' /etc/apt/sources.list
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
RUN pecl install mongodb-1.9.2 && \
    docker-php-ext-enable mongodb

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

RUN pecl install xdebug-3.1.5 && docker-php-ext-enable xdebug